package com.MTA.V01.payload.response;

import com.MTA.V01.models.Ailment;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class FamilyNameAndAilments {
    private String name;
    private List<Ailment> ailments;
}
