package com.MTA.V01.controllers.secure;

import com.MTA.V01.payload.requests.AddDoseRequest;
import com.MTA.V01.payload.requests.EditDoseRequest;
import com.MTA.V01.services.controllers.DoseServices;
import com.MTA.V01.services.controllers.UserServices;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin(origins = {"https://meditracker.fit","http://meditracker.fit", "smrtnmedi.netlify.app","https://www.meditracker.fit","http://meditracker.fit"}, maxAge = 3600)
@RequestMapping("/api/protected/patient")
public class PatientController {
    @Autowired
    UserServices userServices;

    @Autowired
    DoseServices doseServices;

    @GetMapping("/add/{username}/{patientcode}")
    public ResponseEntity<?> addUserToPatients(@PathVariable("username") String username,@PathVariable("patientcode") String patientCode){
        return userServices.addUserToPatients(username,patientCode);
    }

    @GetMapping("/getdoctorcode")
    public ResponseEntity<?> getDoctorCode(){
        return userServices.getPatientCode();
    }

    @GetMapping("/refreshdoctorcode")
    public ResponseEntity<?> refreshDoctorCode(){
        return userServices.refreshPatientCode();
    }

    @DeleteMapping("/remove/{username}")
    public ResponseEntity<?> removeUserFromPatients(@PathVariable("username") String username){
        return userServices.removeUserFromPatients(username);
    }

    @GetMapping("/checkpatients")
    public ResponseEntity<?> checkPatients(){
        return userServices.checkPatients();
    }

    @GetMapping("/checkpatientfamily/{patientId}")
    public ResponseEntity<?> checkPatientFamily(@PathVariable("patientId")  String username){
        return userServices.checkPatientFamilyAilments(username);
    }

    @GetMapping("/checkdose/{username}")
    public ResponseEntity<?> checkPatientDose(@PathVariable("username") String username){
        return userServices.checkPatientDoses(username);
    }

    @GetMapping("/checkactivedose/{username}")
    public ResponseEntity<?> checkActivePatientDoses(@PathVariable("username") String username){
        return userServices.checkPatientActiveDoses(username);
    }

    @PostMapping("/adddose/{patientId}")
    public ResponseEntity<?> addPatientDose(@PathVariable("patientId") Long id, @Valid @RequestBody AddDoseRequest addDoseRequest){
        return doseServices.addUserDoses(id,addDoseRequest);
    }

    @PostMapping("/editdose/{doseId}")
    public ResponseEntity<?> editPatientDose(@PathVariable("doseId") Long id, EditDoseRequest editDoseRequest){
        return doseServices.editUserDose(id,editDoseRequest);
    }
}
